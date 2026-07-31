import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'
import healthRouter from './routes/health.js'
import chatRouter from './routes/chat.js'
import { config } from './config/index.js'

const app = new Koa()

app.use(cors())
app.use(bodyParser())
app.use(healthRouter.routes())
app.use(healthRouter.allowedMethods())
app.use(chatRouter.routes())
app.use(chatRouter.allowedMethods())

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`)
})
