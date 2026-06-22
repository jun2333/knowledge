<template>
    <div>
        <div>
            <input type="text" value="测试页面是否卡顿" />
        </div>
        <h1>测试</h1>
        <input type="file" @change="handleFileChange" />
        <!-- <el-button type="primary" @click="handleUpload" :disabled="uploadDisabled">上传</el-button> -->
        <el-button type="primary" @click="handleUpload">上传</el-button>
        <!-- <el-button type="primary" @click="handleUpload1">慢启动上传</el-button> -->
        <el-button @click="handleResume" v-if="status === Status.pause"
            >恢复</el-button
        >
        <el-button
            v-else
            :disabled="status !== Status.uploading || !container.hash"
            @click="handlePause"
            >暂停</el-button
        >
        <div>
            <div>计算文件 hash</div>
            <el-progress :percentage="hashProgress"></el-progress>
            <div>总进度</div>
            <el-progress :percentage="fakeProgress"></el-progress>
            <div class="cube-container" :style="{ width: cubeWidth + 'px' }">
                <div class="cube" v-for="chunk in chunks" :key="chunk.hash">
                    <div
                        :class="{
                            uploading:
                                chunk.progress > 0 && chunk.progress < 100,
                            success: chunk.progress == 100,
                            error: chunk.progress < 0,
                        }"
                        :style="{ height: chunk.progress + '%' }"
                    >
                        {{ chunk.index }}
                        <i v-if="chunk.progress<100" class="el-icon-loading" style="color:#F56C6C;"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import {
    container,
    chunks,
    hashProgress,
    requestList,
    Status,
    status,
    fakeProgress,
    cubes,
    cubeWidth
} from './appData';
import { handleUpload, handleResume } from './controller';
export default {
    name: 'App',
    setup() {
        const handleFileChange = function(e) {
            const [file] = e.target.files;
            if (!file) return;
            container.file = file;
        };
        const handlePause = () => {
            status = Status.pause;
            requestList.value.forEach(xhr => xhr?.abort());
            requestList.value = [];
        };
        return {
            container,
            chunks,
            hashProgress,
            requestList,
            Status,
            status,
            fakeProgress,
            cubes,
            handleFileChange,
            handleUpload,
            handleResume,
            handlePause,
            cubeWidth
        };
    },
};
</script>

<style>
.cube-container {
    width: 100px;
    overflow: hidden;
}
.cube {
    width: 14px;
    height: 14px;
    line-height: 12px;
    border: 1px solid black;
    background: #eee;
    float: left;
}

.cube > .success {
    background: #67c23a;
}
.cube > .uploading {
    background: #409eff;
}
.cube > .error {
    background: #f56c6c;
}
</style>
