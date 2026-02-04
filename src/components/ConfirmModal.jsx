import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="confirm-overlay" onClick={onCancel}>
                    <motion.div
                        className="confirm-card"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="confirm-icon">
                            <img src="https://cdn-icons-png.flaticon.com/512/564/564619.png" alt="Warning" />
                        </div>
                        <h3>{title}</h3>
                        <p>{message}</p>
                        <div className="confirm-actions">
                            <button className="confirm-btn cancel" onClick={onCancel}>
                                Cancel
                            </button>
                            <button className="confirm-btn confirm" onClick={onConfirm}>
                                Confirm
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
