import * as types from '../../mutation-types'
import lazyLoading from './lazyLoading'
import charts from './charts'
// import uifeatures from './uifeatures'
// import components from './components'
// import tables from './tables'
import chains from './chains'
import hosts from './hosts'

// show: meta.label -> name
// name: component name
// meta.label: display label

const state = {
  items: [
    {
      name: 'Dashboard',
      path: '/dashboard',
      meta: {
        icon: 'fa-tachometer',
        link: 'dashboard/index.vue'
      },
      component: lazyLoading('dashboard', true)
    },
    {
      name: 'System Status',
      path: '/axiosDemo',
      meta: {
        auth: true,
        icon: 'fa-rocket',
        link: 'status/index.vue'
      },
      component: lazyLoading('status', true)
    },
    {
      name: 'Hosts',
      path: '/axiosDemo',
      meta: {
        auth: true,
        icon: 'fa-cubes',
        link: 'hosts/index.vue'
      },
      component: lazyLoading('axios', true)
    },
    hosts,
    chains,
    charts,
    // uifeatures,
    // components,
    {
      name: 'Release History',
      path: '/axiosDemo',
      meta: {
        auth: true,
        icon: 'fa-rocket',
        link: 'axios/index.vue'
      },
      component: lazyLoading('axios', true)
    }
    // ,
    // tables
  ]
}

const mutations = {
  [types.EXPAND_MENU] (state, menuItem) {
    if (menuItem.index > -1) {
      if (state.items[menuItem.index] && state.items[menuItem.index].meta) {
        state.items[menuItem.index].meta.expanded = menuItem.expanded
      }
    } else if (menuItem.item && 'expanded' in menuItem.item.meta) {
      menuItem.item.meta.expanded = menuItem.expanded
    }
  }
}

export default {
  state,
  mutations
}
