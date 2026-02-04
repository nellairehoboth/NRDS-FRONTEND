import React from 'react';
import { motion } from 'framer-motion';
import './Toast.css';

const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
};

const Toast = ({ toast, onRemove }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`toast toast-${toast.type}`}
        >
            <div className="toast-icon">{icons[toast.type] || icons.info}</div>
            <div className="toast-content">{toast.message}</div>
            <button className="toast-close" onClick={() => onRemove(toast.id)}>×</button>

            {/* Progress Bar Animation */}
            <motion.div
                className="toast-progress"
                initial={{ width: '100%' }}
                animate={{ width: 0 }}
                transition={{ duration: toast.duration / 1000, ease: 'linear' }}
            />
        </motion.div>
    );
};

export default Toast;
