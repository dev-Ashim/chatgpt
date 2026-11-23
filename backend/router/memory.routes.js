const express = require('express')
const router = express.Router()
const authMiddleware = require("../middleware/auth.middelware")
const memoryController = require('../controller/memory.controller')

router.get('/', authMiddleware.authUser, memoryController.listMemories)
router.delete('/', authMiddleware.authUser, memoryController.forgetAllMemories)
router.delete('/:memoryId', authMiddleware.authUser, memoryController.forgetMemory)

module.exports = router
