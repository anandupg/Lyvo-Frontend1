import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const AlertModal = ({
    isOpen,
    onClose,
    title,
    message,
    buttonText = 'Okay',
    type = 'warning' // 'warning', 'danger', 'info', 'success'
}) => {
    if (!isOpen) return null;

    const icons = {
        warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
        danger: <AlertCircle className="w-6 h-6 text-red-500" />,
        info: <Info className="w-6 h-6 text-blue-500" />,
        success: <CheckCircle className="w-6 h-6 text-green-500" />
    };

    const buttonColors = {
        warning: 'bg-yellow-600 hover:bg-yellow-700',
        danger: 'bg-red-600 hover:bg-red-700',
        info: 'bg-blue-600 hover:bg-blue-700',
        success: 'bg-green-600 hover:bg-green-700'
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${type === 'danger' ? 'bg-red-50' : type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                                    {icons[type]}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-gray-600 mb-8 leading-relaxed">
                            {message}
                        </p>

                        <button
                            onClick={onClose}
                            className={`w-full px-4 py-3 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-black/5 flex items-center justify-center gap-2 ${buttonColors[type]}`}
                        >
                            {buttonText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AlertModal;
