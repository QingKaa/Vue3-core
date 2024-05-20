export enum ShapeFlags {
  ELEMENT = 1,      // 元素
  FUNCTIONAL_COMPONENT = 1 << 1,// 10 => 2            功能性组件
  STATEFUL_COMPONENT = 1 << 2,  // 100 => 4           状态组件
  TEXT_CHILDREN = 1 << 3,       //  1000 => 8         文本子节点
  ARRAY_CHILDREN = 1 << 4,      //  10000 => 16       遍历的组件
  SLOTS_CHILDREN = 1 << 5,      //  100000 => 32      槽内的组件
  TELEPORT = 1 << 6,            //  1000000 => 64     Teleport 组件
  SUSPENSE = 1 << 7,            //  10000000 => 128   Suspense 组件
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,  //   100000000 => 256   需要缓存的组件
  COMPONENT_KEPT_ALIVE = 1 << 9,          //  1000000000 => 512  已经缓存的组件
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT,
}
