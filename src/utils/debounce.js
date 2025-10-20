/**
 * Debounce function execution
 * @template {Function} T
 * @param {T} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {(...args: Parameters<T>) => Promise<ReturnType<T>>}
 */
function debounce(func, wait) {
    let timeout = null;

    return function debounced(...args) {
        return new Promise((resolve, reject) => {
            if (timeout) {
                clearTimeout(timeout);
            }

            timeout = setTimeout(async () => {
                try {
                    const result = await func(...args);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }, wait);
        });
    };
}

module.exports = { debounce };
