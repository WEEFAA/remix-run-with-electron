import { get, post, route } from 'remix/fetch-router/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  blogs: {
    index: get('/blogs'),
    create: post('/blogs'),
    new: get('/blogs/new'),
    show: get('/blogs/:id'),
  },
})
