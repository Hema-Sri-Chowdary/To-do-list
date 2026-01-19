const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const { taskValidation, taskUpdateValidation } = require('../middleware/validation');

// All routes are protected - require authentication
router.use(protect);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for authenticated user
 * @access  Private
 */
router.get('/', async (req, res) => {
    try {
        const { completed, date, sortBy = 'createdAt', order = 'desc' } = req.query;

        // Build query
        const query = { userId: req.user._id };

        // Filter by completion status
        if (completed !== undefined) {
            query.completed = completed === 'true';
        }

        // Filter by date
        if (date) {
            query.date = date;
        }

        // Sort options
        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;

        // Get tasks
        const tasks = await Task.find(query).sort(sortOptions);

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });

    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tasks',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        res.status(200).json({
            success: true,
            data: task
        });

    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching task',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/tasks
 * @desc    Create new task
 * @access  Private
 */
router.post('/', taskValidation, async (req, res) => {
    try {
        const { name, time, date, progress, completed, icon, color } = req.body;

        // Create deadline from date and time
        const deadline = `${date} ${time}`;

        // Create task
        const task = await Task.create({
            userId: req.user._id,
            name,
            time,
            date,
            deadline,
            progress: progress || 0,
            completed: completed || false,
            icon: icon || '📝',
            color: color || 'purple'
        });

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: task
        });

    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating task',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 * @access  Private
 */
router.put('/:id', taskUpdateValidation, async (req, res) => {
    try {
        // Find task
        let task = await Task.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Update fields
        const { name, time, date, progress, completed, icon, color } = req.body;

        if (name !== undefined) task.name = name;
        if (time !== undefined) task.time = time;
        if (date !== undefined) task.date = date;
        if (progress !== undefined) task.progress = progress;
        if (completed !== undefined) task.completed = completed;
        if (icon !== undefined) task.icon = icon;
        if (color !== undefined) task.color = color;

        // Update deadline if date or time changed
        if (time !== undefined || date !== undefined) {
            task.deadline = `${task.date} ${task.time}`;
        }

        // Auto-update progress if completed status changes
        if (completed !== undefined) {
            task.progress = completed ? 100 : task.progress;
        }

        await task.save();

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: task
        });

    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating task',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete single task
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Task deleted successfully',
            data: task
        });

    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting task',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/tasks/bulk-delete
 * @desc    Delete multiple tasks
 * @access  Private
 */
router.post('/bulk-delete', async (req, res) => {
    try {
        const { taskIds } = req.body;

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of task IDs'
            });
        }

        // Delete tasks
        const result = await Task.deleteMany({
            _id: { $in: taskIds },
            userId: req.user._id
        });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} task(s) deleted successfully`,
            data: {
                deletedCount: result.deletedCount
            }
        });

    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting tasks',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/tasks/stats
 * @desc    Get task statistics for dashboard
 * @access  Private
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const userId = req.user._id;

        // Get all tasks
        const allTasks = await Task.find({ userId });
        const totalTasks = allTasks.length;

        // Count completed tasks
        const completedTasks = allTasks.filter(task => task.completed).length;

        // Count in-progress tasks (not completed but has progress > 0)
        const inProgressTasks = allTasks.filter(task => !task.completed && task.progress > 0).length;

        // Count pending tasks (not completed and progress = 0)
        const pendingTasks = allTasks.filter(task => !task.completed && task.progress === 0).length;

        // Calculate completion percentage
        const completionPercentage = totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                totalTasks,
                completedTasks,
                inProgressTasks,
                pendingTasks,
                completionPercentage
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
});

module.exports = router;
