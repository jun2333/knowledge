// 设计一个支持 push ，pop ，top 操作，并能在常数时间内检索到最小元素的栈。

// 实现 MinStack 类:

// MinStack() 初始化堆栈对象。
// void push(int val) 将元素val推入堆栈。
// void pop() 删除堆栈顶部的元素。
// int top() 获取堆栈顶部的元素。
// int getMin() 获取堆栈中的最小元素。


// 每一项都有当前最小项的值
var MinStack = function() {
    this.list = []
};

/** 
 * @param {number} val
 * @return {void}
 */
MinStack.prototype.push = function(val) {
    const min = this.list.length ? Math.min(val, this.getMin()) : val
    this.list.push({val, min})
};

/**
 * @return {void}
 */
MinStack.prototype.pop = function() {
    this.list.pop()
};

/**
 * @return {number}
 */
MinStack.prototype.top = function() {
    return this.list[this.list.length-1].val
};

/**
 * @return {number}
 */
MinStack.prototype.getMin = function() {
    return this.list[this.list.length-1].min
};

/** 
 * Your MinStack object will be instantiated and called as such:
 * var obj = new MinStack()
 * obj.push(val)
 * obj.pop()
 * var param_3 = obj.top()
 * var param_4 = obj.getMin()
 */