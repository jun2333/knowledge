import { useContext } from 'react'
import { RouterContext  } from '../component/Router'
/* 用useContext获取上下文中的location对象 */
export default function  useLocation() {
    return useContext(RouterContext).location
}