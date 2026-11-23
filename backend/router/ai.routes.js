const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth.middelware')
const aiController = require('../controller/ai.controller')

router.get('/models', authMiddleware.authUser, aiController.listModels)

// Body is the raw recorded audio (e.g. audio/webm from MediaRecorder)
router.post(
    '/transcribe',
    authMiddleware.authUser,
    express.raw({ type: ['audio/*', 'video/webm', 'application/octet-stream'], limit: '25mb' }),
    aiController.transcribe
)

module.exports = router
