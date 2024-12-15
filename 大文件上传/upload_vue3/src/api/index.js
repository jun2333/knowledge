import { request, post } from "./request";
async function verify(filename, hash) {
    const data = await post('/verify', { filename, hash });
    return data;
}

async function mergeRequest(filename, size, fileHash) {
    await post("/merge", {
      filename,
      size,
      fileHash
    });
    // await request({
    //   url: "/merge",
    //   headers: {
    //     "content-type": "application/json"
    //   },
    //   data: JSON.stringify({
    //     filename: this.container.file.name,
    //     size:SIZE
    //   })
    // })
  }

export {
    verify,
    mergeRequest
}