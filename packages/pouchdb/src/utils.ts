import Promise from 'pouchdb-promise'
import argsarray from 'argsarray'

/* istanbul ignore next */
export function once(fun: Function): Function {
  let called = false
  return getArguments(function (args: any[]) {
    if (called) {
      console.trace()
      throw new Error('once called  more than once')
    } else {
      called = true

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      fun.apply(this, args)
    }
  })
}

export const getArguments = argsarray

/* istanbul ignore next */
export function toPromise(func: Function): Function {
  return getArguments(function (args: any[]) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const val = this
    const tempCB = typeof args[args.length - 1] === 'function' ? args.pop() : false

    let usedCB: ((err: Error | null, resp?: any) => void) | undefined
    if (tempCB) {
      usedCB = function (err: Error | null, resp?: any) {
        process.nextTick(function () {
          ;(tempCB as Function)(err, resp)
        })
      }
    }

    const promise = new Promise(function (fulfill: Function, reject: Function) {
      try {
        const callback = once(function (err: Error | null, mesg?: any) {
          if (err) {
            reject(err)
          } else {
            fulfill(mesg)
          }
        })
        args.push(callback)
        func.apply(val, args)
      } catch (e) {
        reject(e)
      }
    })

    if (usedCB) {
      promise.then(function (result: any) {
        usedCB!(null, result)
      }, usedCB)
    }

    ;(promise as any).cancel = function () {
      return this
    }

    return promise
  })
}
