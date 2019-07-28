const mongoose = require('mongoose');
const Product = require('../models/product');
const {validationResult} = require('express-validator/check');
const fileHelper = require('../util/file');

exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        errorMessage: [],
        validationErrors: [],
        hasError: false,
        editing: false,
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    const errors = validationResult(req);
    if (!image) {
        return res.render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            errorMessage: 'Attached file is not an image',
            hasError: true,
            validationErrors: [],
            product: {
                title,
                price,
                description,
            }
        });
    }
    if (!errors.isEmpty()) {
        return res.render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            errorMessage: errors.array()[0].msg,
            hasError: true,
            validationErrors: errors.array(),
            product: {
                title,
                price,
                description,
            }
        });
    }
    const imageUrl = image.path;
    const product = new Product({
        title,
        price,
        description,
        imageUrl,
        userId: req.user
    });
    product.save()
        .then(result => {
            // console.log(result);
            console.log('Created Product');
            res.redirect('/admin/products');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = '500';
            next(error);
        });
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect('/');
            }
            res.render('admin/edit-product', {
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                errorMessage: [],
                hasError: false,
                validationErrors: [],
                editing: editMode,
                product: product,
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = '500';
            next(error);
        });
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const image = req.file;
    const updatedDesc = req.body.description;
    const errors = validationResult(req);
    console.log("Errors: ");
    console.log(errors.array());
    if (!errors.isEmpty()) {
        return res.render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            errorMessage: errors.array()[0].msg,
            hasError: true,
            validationErrors: errors.array(),
            product: {
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDesc,
                _id: prodId
            }
        });
    }
    let globalProduct;
    Product.findById(prodId)
        .then(product => {
            globalProduct = product;
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect('/')
            }
            if (image) {
                return fileHelper.deleteFile(product.imageUrl);
            }
        })
        .then(() => {
            let product = globalProduct;
            product.imageUrl = image.path;
            product.title = updatedTitle;
            product.price = updatedPrice;
            product.description = updatedDesc;
            return product.save()
                .then(result => {
                    console.log('UPDATED PRODUCT!');
                    res.redirect('/admin/products');
                });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = '500';
            next(error);
        });
};

exports.getProducts = (req, res, next) => {
    Product.find({userId: req.user})
        .then(products => {
            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: '/admin/products',
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = '500';
            next(error);
        });
};

exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                throw new Error('Product not found');
            }
            return fileHelper.deleteFile(product.imageUrl);
        })
        .then(() => {
            return Product.deleteOne({_id: prodId, userId: req.user});
        })
        .then(() => {
            console.log('DESTROYED PRODUCT');
            res.status(200).json({message: 'Success'});
        })
        .catch(err => {
            res.status(500).json({message: 'Failed to delete a product'});
        });
};
