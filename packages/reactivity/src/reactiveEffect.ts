import { isArray, isIntegerKey, isMap, isSymbol } from '@vue/shared'
import { DirtyLevels, type TrackOpTypes, TriggerOpTypes } from './constants'
import { type Dep, createDep } from './dep'
import {
  activeEffect,
  pauseScheduling,
  resetScheduling,
  shouldTrack,
  trackEffect,
  triggerEffects,
} from './effect'

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Maps to reduce memory overhead.
//存储｛target->key->dep｝连接的主要WeakMap。   
//从概念上讲，更容易将依赖项视为Dep类   
//它维护一组订阅者，但我们只是将它们存储为    
//原始映射以减少内存开销。    
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<object, KeyToDepMap>()

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')

/**
 * Tracks access to a reactive property.
 *
 * This will check which effect is running at the moment and record it as dep
 * which records all effects that depend on the reactive property.
 *
 * TrackOpTypes: get, has, iterate    
 * 
 * @param target - Object holding the reactive property.
 * @param type - Defines the type of access to the reactive property. 依赖收集的属性类型
 * @param key - Identifier of the reactive property to track. 依赖手机的标识符
 */ 
export function track(target: object, type: TrackOpTypes, key: unknown) {
  // 只有在 shouldTrack === true 并且 activeEffect 为真的情况下才收集依赖
  if (shouldTrack && activeEffect) {
    // 获取目标对象的 depMap
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      // 不存在（首次收集依赖）情况：创建在 targetMap上以 target 为键创建一个空的 depMap
      targetMap.set(target, (depsMap = new Map()))
    }
    // 获取键对应的 dep
    let dep = depsMap.get(key)
    if (!dep) {
      // dep不存在：创建一个 dep 并将其存储在 depsMap 中
      depsMap.set(key, (dep = createDep(() => depsMap!.delete(key))))
    }
    trackEffect(
      activeEffect,
      dep,
      __DEV__
        ? {
            target,
            type,
            key,
          }
        : void 0,
    )
  }
}

/**
 * 查找目标对象(或者特殊的属性)所有关联的 dep（依赖），并触发其中存储的 effect
 * Finds all deps associated with the target (or a specific property) and
 * triggers the effects stored within.
 *
 * TriggerOpTypes: set, add, delete, clear
 * 
 * @param target - The reactive object.
 * @param type - Defines the type of the operation that needs to trigger effects.
 * @param key - Can be used to target a specific reactive property in the target object.
 */
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>,
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // never been tracked
    return
  }

  // 保存需要触发的dep
  let deps: (Dep | undefined)[] = []
  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    // 清空操作：触发目标所有的依赖
    deps = [...depsMap.values()]
  } else if (key === 'length' && isArray(target)) {
    // 触发数组的 length 属性
    const newLength = Number(newValue)
    depsMap.forEach((dep, key) => {
      // key 是 length 或者  key不是symbol类型 并且 key 值大于等于新的数组长度
      // 直接改变数组的长度，需要触发 length 的dep，假如是新的长度变小了，相当于删除了新长度后面的元素，所以后面删除的元素对应的依赖也需要执行
      if (key === 'length' || (!isSymbol(key) && key >= newLength)) {
        deps.push(dep)
      }
    })
  } else {
    // schedule runs for SET | ADD | DELETE
    // SET | ADD | DELETE 对应的dep
    if (key !== void 0) {
      deps.push(depsMap.get(key))
    }

    // also run for iteration key on ADD | DELETE | Map.SET
    // 根据不同的操作类型，将引起的 iterate 的依赖也需要触发
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          // 普通数组的 iterate
          deps.push(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            // Map 类型的 iterate
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        } else if (isIntegerKey(key)) {
          // new index added to array -> length changes
          // 整数键值添加到数组中，length 改变
          deps.push(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.DELETE:
        // 删除操作
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        }
        break
      case TriggerOpTypes.SET:
        // Map 的 set操作
        if (isMap(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
        }
        break
    }
  }

  // 需要触发的dep收集完成

  // 暂停触发依赖
  pauseScheduling()
  // 遍历deps触发其中的副作用effect
  for (const dep of deps) {
    // dep 可能是undefined
    if (dep) {
      // 执行副作用
      triggerEffects(
        dep,
        DirtyLevels.Dirty,
        __DEV__
          ? {
              target,
              type,
              key,
              newValue,
              oldValue,
              oldTarget,
            }
          : void 0,
      )
    }
  }
  // 重启触发依赖
  resetScheduling()
}

export function getDepFromReactive(object: any, key: string | number | symbol) {
  return targetMap.get(object)?.get(key)
}
