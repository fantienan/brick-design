import {
	createElement,
	forwardRef,
	memo,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {
	ChildNodesType,
	clearDropTarget,
	getComponentConfig,
	handleRules,
	produce,
	PropsNodeType,
	ROOT,
	STATE_PROPS,
} from '@brickd/core';
import { useCommon } from '@brickd/hooks';
import { VirtualDOMType } from '@brickd/utils';
import {
	generateRequiredProps,
	getComponent,
} from '../utils';

import {
	CommonPropsType,
	controlUpdate,
	handleChildNodes,
	handleEvents,
	handleModalTypeContainer,
	handlePropsClassName,
	HookState,
	propAreEqual,
	stateSelector,
} from '../common/handleFuns';
import { getDropTargetInfo } from '../common/events';
import { useSelect } from '../hooks/useSelect';
import { useDragDrop } from '../hooks/useDragDrop';
import { useChildNodes } from '../hooks/useChildNodes';
import { useSelector } from '../hooks/useSelector';


/**
 * 所有的容器组件名称
 */
function Container(allProps: CommonPropsType, ref: any) {
	const {
		specialProps,
		specialProps: { key, domTreeKeys },
		isDragAddChild,
		...rest
	} = allProps;

	const { pageConfig: PageDom } = useSelector<
		HookState,
		STATE_PROPS
	>(stateSelector, (prevState, nextState) =>
		controlUpdate(prevState, nextState, key),
	);
	const { dragSource, dropTarget,isInvisible } = useDragDrop(key);
	const { dragKey, parentKey, vDOMCollection } = dragSource || {};
	const { selectedKey } = dropTarget || {};

	const pageConfig = PageDom[ROOT] ? PageDom : vDOMCollection || {};
	const vNode=(pageConfig[key] || {}) as VirtualDOMType;
	const { childNodes, componentName} = vNode;
	const{props,hidden}=useCommon(vNode,rest);
	useChildNodes({ childNodes, componentName, specialProps });
	const [children, setChildren] = useState<ChildNodesType | undefined>(
		childNodes,
	);
	const { mirrorModalField, nodePropsConfig } = useMemo(
		() => getComponentConfig(componentName),
		[],
	);
	const { selectedDomKeys, isSelected } = useSelect(
		specialProps,
		!!mirrorModalField,
	);

	const onDragEnter = (e: Event) => {
		e.stopPropagation();
		let propName;
		//判断当前组件是否为拖拽组件的父组件或者是否为子孙组件或者它自己
		if (
			parentKey !== key &&
			dragKey &&
			dragKey !== key &&
			!domTreeKeys.includes(dragKey) &&
			(!selectedDomKeys || !selectedDomKeys.includes(dragKey))
		) {
			if (childNodes) {
				if (Array.isArray(childNodes)) {
					if (!handleRules(pageConfig, dragKey, key, undefined, true)) {
						setChildren([...childNodes, dragKey]);
					}
				} else {
					setChildren(
						produce(childNodes as PropsNodeType, (oldChild) => {
							propName = Object.keys(oldChild!)[0];
							if (
								!handleRules(pageConfig, dragKey, key, propName, true)
							) {
								oldChild![propName] = [...oldChild[propName]!, dragKey];
							}
						}),
					);
				}
			} else {
				if (!nodePropsConfig) {
					setChildren([dragKey]);
				} else {
					const keys = Object.keys(nodePropsConfig);
					propName = keys[0];
					setChildren({ [propName]: [dragKey] });
				}
			}
		}
		getDropTargetInfo(e, domTreeKeys, key, propName);
	};
	const onDragLeave = (e: Event) => {
		e.stopPropagation();
		if (isSelected) {
			clearDropTarget();
		}
	};

	useEffect(() => {
		setChildren(childNodes);
	}, [childNodes]);
	if ((!selectedKey || selectedKey !== key) && children !== childNodes) {
		setChildren(childNodes);
	}
	if (!isSelected&&(!componentName||hidden)) return null;

	let modalProps: any = {};
	if (mirrorModalField) {
		const { displayPropName, mountedProps } = handleModalTypeContainer(
			mirrorModalField,
		);
		const isVisible = isSelected || (selectedDomKeys && selectedDomKeys.includes(key));
		modalProps =isVisible? { [displayPropName]: isVisible, ...mountedProps }:mountedProps;
	}

	const { className, animateClass, ...restProps } = props || {};
	return createElement(getComponent(componentName), {
		...restProps,
		className: handlePropsClassName(
			key,
			isInvisible && !isDragAddChild,
			dragKey === key,
			className,
			animateClass,
		),
		...(isDragAddChild
			? {}
			: {
					onDragEnter,
					onDragLeave,
					...handleEvents(specialProps, isSelected, childNodes),
			  }),
		...generateRequiredProps(componentName),
		...handleChildNodes(
			specialProps,
			pageConfig,
			children!,
			dragKey,
			childNodes !== children,
			isDragAddChild,
		),
		...props,
		draggable: true,
		/**
		 * 设置组件id方便抓取图片
		 */
		ref,
		...modalProps,
	});
}

export default memo<CommonPropsType>(forwardRef(Container), propAreEqual);
