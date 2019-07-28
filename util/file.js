const fs = require('fs');

const deleteFile = (filePath) => {
    return new Promise((resolved, rejected) => {
        fs.unlink(filePath, (err) => {
                if (err) {
                    return rejected(new Error(err));
                }
                return resolved();
            }
        )
    })
};

exports.deleteFile = deleteFile;