import { get, post, route } from 'remix/fetch-router/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  blogs: {
    index: get('/blogs'),
    create: post('/blogs'),
    new: get('/blogs/new'),
    rss: '/blogs/rss.xml',
    show: get('/blogs/:id'),
  },
})
