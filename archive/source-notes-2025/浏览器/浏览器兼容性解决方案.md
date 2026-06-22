## 浏览器兼容性解决方案

### 常见问题以及解决方案

#### css

##### 默认内外边距不同

使用Normalize.css抹平浏览器差异，或者定制reset.css进行处理

##### ie6双倍边距问题

块级元素设置浮动之后同时又设置margin会出现双倍边距，解决方案：`display:inline`

##### 多个img标签在一行时默认有边距

使用float布局

##### ie6不支持min-height

使用hack，`min-height:100px;_height:100px`

##### 统一使用`cursor:pointer`

因为safari不支持`cursor:hand`

##### 清除浮动

```css
.clearfix{
    zoom:1
}
.clearfix::before{
    display:block;
    content:'';
    clear:both;
    visibility:hidden;
    height:0
}
```

##### respond.js

解决ie9以下浏览器不支持media query问题

#### html

##### html5shiv.js

解决h5标签在ie9以下浏览器不能识别问题，使用条件注释引入js

##### picturefill.js

解决ie浏览器不支持picture标签问题

#### javascript

##### keyCode兼容写法

```javascript
function getKeyCode(e) {
  e = e ? e : (window.event ? window.event : "")
  return e.keyCode ? e.keyCode : e.which
}
```

##### DOM事件处理兼容写法

```javascript
var eventshiv = {
    getEvent(event){
        return event || window.event
    },
    getTarget(event){
        return event.target || event.srcElement
    },
    addHandler(elem, type, handler){
        if(elem.addEventListener){
            elem.addEventListener(type, handler, false)
        }else if(elem.attachEvent){
            elem.attachEvent('on'+type, handler)
        }else{
            ele['on'+type] = handler
        }
    },
    removeHandler(elem, type, handler){
        f(elem.addEventListener){
            elem.removeEventListener(type, handler, false)
        }else if(elem.attachEvent){
            elem.dettachEvent('on'+type, handler)
        }else{
            ele['on'+type] = null
        }
    },
    preventDefault(event){
        if(event.preventDefault){
            event.preventDefault()
        }else{
            event.returnValue = false
        }
    },
    stopPropagation(event){
        if(event.stopPropagation){
            event.stopPropagation()
        }else{
            event.cancelBubble = true
        }
    }
}
```

##### ajax实现

ie下是activeXObject对象实现，chrome是XMLHttpRequest对象实现

### 条件注释(lt:小于 gt:大于 lte:小于等于 gte:大于等于)

```html
<!-- [if lt IE 9]>
<![end if]>
```

### css兼容前缀

```css
-o-transform:rotate(7deg); // Opera

-ms-transform:rotate(7deg); // IE

-moz-transform:rotate(7deg); // Firefox

-webkit-transform:rotate(7deg); // Chrome

transform:rotate(7deg); // 统一标识语句
```

### 常用hack

_:ie6

*:ie7

\9:ie8以上



##### 