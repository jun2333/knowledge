// 并发控制
class Schedler{
    constructor(max){
        this.max = max
        this.queue = []
        this.lanes = 0
    }
    addTask(task){
        this.queue.push(task)
    }
    run(){
        for(let i=0; i<this.max; i++){
            this.runItemTask()
        }
    }
    runItemTask(){
        if(!this.queue.length || this.lanes >= this.max) return
        this.lanes++
        this.queue.shift()().finally(()=>{
            this.lanes--
            this.runItemTask()
        })
    }
}