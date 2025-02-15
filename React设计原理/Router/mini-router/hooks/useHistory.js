import { useContext } from 'react'
import { RouterContext  } from '../component/Router'
/* 用useContext获取上下文中的history对象 */
export default function useHistory() {
    return useContext(RouterContext).history
}