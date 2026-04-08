import React, {useEffect} from 'react';
import {useStore} from '@store';

const ProductCatalogCacheService = () => {
  const categoriesStore = useStore('categories');
  const productsStore = useStore('products');

  const categoryActions = categoriesStore.actions;
  const productActions = productsStore.actions;

  const {messages, message} = categoriesStore.getters;

  useEffect(() => {
    if (
      messages &&
      messages.length > 0 &&
      (!message || Object.keys(message).length === 0)
    ) {
      const nextMessages = [...messages];
      categoryActions.setMessage(nextMessages.pop());
      categoryActions.setMessages(nextMessages);
    }
  }, [categoryActions, message, messages]);

  useEffect(() => {
    if (!message || Object.keys(message).length === 0) {
      return;
    }

    if (message?.command !== 'clear-product-cache') {
      categoryActions.setMessage(null);
      return;
    }

    localStorage.setItem('categories', JSON.stringify([]));
    localStorage.removeItem('categories-company');
    categoryActions.setItems([]);
    productActions.setItems([]);
    categoryActions.setMessage(null);
  }, [categoryActions, message, productActions]);

  return null;
};

export default ProductCatalogCacheService;
