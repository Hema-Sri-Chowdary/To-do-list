const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    name: {
        type: String,
        required: [true, 'Task name is required'],
        trim: true
    },
    time: {
        type: String,
        required: [true, 'Task time is required']
    },
    date: {
        type: String,
        required: [true, 'Task date is required']
    },
    deadline: {
        type: String,
        required: [true, 'Task deadline is required']
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    completed: {
        type: Boolean,
        default: false
    },
    icon: {
        type: String,
        default: '📝'
    },
    color: {
        type: String,
        enum: ['purple', 'blue', 'orange', 'green', 'pink'],
        default: 'purple'
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for faster queries
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, completed: 1 });

// Method to toggle completion
taskSchema.methods.toggleComplete = function () {
    this.completed = !this.completed;
    this.progress = this.completed ? 100 : 0;
    return this.save();
};

module.exports = mongoose.model('Task', taskSchema);
