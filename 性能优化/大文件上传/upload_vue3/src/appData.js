import { reactive, ref, computed } from 'vue';
let cubesInit = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 100, 100, 100, 1, 0];
const container = reactive({ file: null });
const chunks = ref([]);
const hashProgress = ref(0);
const requestList = ref([]);
const Status = reactive({
    wait: 'wait',
    pause: 'pause',
    uploading: 'uploading',
    error: 'error',
    done: 'done',
});
const status = ref(Status.wait);
const fakeProgress = ref(0);
const cubes = ref(cubesInit);
const cubeWidth = computed(()=>{
    return Math.ceil(Math.sqrt(chunks.value.length))*16
})
export {
    container,
    chunks,
    hashProgress,
    requestList,
    Status,
    status,
    fakeProgress,
    cubes,
    cubeWidth
};
