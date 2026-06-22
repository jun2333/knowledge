//递归实现
function each(arr) {
  let res = ''
  function eachStep(arr) {
    for (let item of arr) {
      if (item instanceof Array) {
        eachStep(item)
      } else {
        res += item
      }
    }
  }
  eachStep(arr)
  return res
}

//非递归实现(重写toString)
function flat(arr) {
  let toStringFn = Array.prototype.toString
  Array.prototype.toString = function () {
    return this.join(',')
  }
  let f = (arr) => {
    return arr + ''
  }
  Array.prototype.toString = toStringFn
  return f(arr)
}

//非递归实现(重写valueOf)
function flat1(arr) {
  let valueOfFn = Array.prototype.valueOf
  Array.prototype.valueOf = function () {
    return this.join(',')
  }
  let f = (arr) => {
    return arr + ''
  }
  Array.prototype.valueOf = valueOfFn
  return f(arr)
}

//重写遍历器
function flat2(arr) {
  let res = ''
  let iterator = Array.prototype[Symbol.iterator]
  Array.prototype[Symbol.iterator] = function () {
    let arr = [].concat(this)
    const getFirst = (a) => {
      return a.shift()
    }
    return {
      next() {
        let res = getFirst(arr)
        if (res) {
          return {
            value: res,//此处会进行隐式转换调用[].toString方法
            done: false,
          }
        }
        return {
          done: true,
        }
      },
    }
  }
  for(let item of arr){
    res+=item
  }
  Array.prototype[Symbol.iterator] = iterator
  return res
}
