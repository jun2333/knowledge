## 获取元素宽高方案
1. dom.style.width/height
2. dom.getCurrentStyle.width/height(IE)
3. window.getComputedStyle(dom).width/height
4. dom.getBoundingClientRect().width/height
5. dom.offsetWidth/offsetHeight

获取屏幕的高度和宽度（屏幕分辨率）： window.screen.height/width
获取屏幕工作区域的高度和宽度（去掉状态栏）： window.screen.availHeight/availWidth
网页全文的高度和宽度： document.body.scrollHeight/Width
滚动条卷上去的高度和向右卷的宽度： document.body.scrollTop/scrollLeft
网页可见区域的高度和宽度（不加边线）： document.body.clientHeight/clientWidth
网页可见区域的高度和宽度（加边线）： document.body.offsetHeight/offsetWidth