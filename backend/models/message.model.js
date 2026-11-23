const mongoose = require('mongoose')

const attachmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
}, { _id: false })

const messageSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
    },
    content: { type: String, default: "" },
    // Only file names/types are stored; file contents are sent to the AI once and not persisted
    attachments: { type: [attachmentSchema], default: [] },
    role: {
        type: String,
        enum: ["user", "model"],
        default: "user"
    },
    // True once the user removes this message from long-term memory (its vector is deleted)
    forgotten: { type: Boolean, default: false }
}, {
    timestamps: true
})

const messageModel = mongoose.model("message", messageSchema)
module.exports = messageModel
