const express = require('express');
const {body} = require('express-validator/check');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.use(isAuth);

// /admin/add-product => GET
router.get('/add-product', adminController.getAddProduct);

// /admin/products => GET
router.get('/products', adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product',
    [
        body('title')
            .isString()
            .isLength({min: 3})
            .trim(),
        body('price')
            .isFloat(),
        body('description')
            .isString()
            .isLength({min: 3, max: 400})
            .trim(),
    ],
    adminController.postAddProduct
);

router.get('/edit-product/:productId', adminController.getEditProduct);

router.post('/edit-product',
    [
        body('title')
            .isString()
            .isLength({min: 3})
            .trim(),
        body('price')
            .isFloat(),
        body('description')
            .isString()
            .isLength({min: 3, max: 400})
            .trim(),
    ],
    adminController.postEditProduct
);

router.delete('/product/:productId', adminController.deleteProduct);

module.exports = router;
