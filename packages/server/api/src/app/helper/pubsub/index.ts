import { QueueMode, system, SystemProp } from '@activepieces/server-shared'
import { createRedisClient } from '../../database/redis-connection'
import { memoryPubSub } from './memory-pubsub'
import { redisPubSub } from './redis-pubsub'

const queueMode = system.getOrThrow<QueueMode>(SystemProp.QUEUE_MODE)

export const pubSub =
  queueMode === QueueMode.MEMORY
      ? memoryPubSub
      : redisPubSub(createRedisClient(), createRedisClient())
