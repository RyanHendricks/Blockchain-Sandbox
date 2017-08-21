$(function(){
  var config = {
    settings:{
        hasHeaders: true,
        constrainDragToContainer: true,
        reorderEnabled: false,
        selectionEnabled: true,
        popoutWholeStack: false,
        blockedPopoutsThrowError: true,
        closePopoutsOnUnload: true,
        showPopoutIcon: false,
        showMaximiseIcon: false,
        showCloseIcon: false
    },
    content: [
      {
        type: 'row',
        content:[
          {
            type: 'column',
            width: 60,
            content: [
              {
                type: 'stack',
                height: 55,
                content:[
                  {
                    type: 'component',
                    componentName: 'layout',
                    isClosable: false,
                    title:'Market',
                    componentState: { id: 'market_container', type: 'ejs' }
                  },
                  {
                    type: 'component',
                    componentName: 'layout',
                    isClosable: false,
                    title:'Guides',
                    componentState: { id: 'guides', type: 'ejs' }
                  }
                ]
              },
              {
                type: 'stack',
                content: [
                  {
                    type: 'component',
                    componentName: 'layout',
                    isClosable: false,
                    title:'Trade log',
                    componentState: { id: 'events', type: 'ejs' }
                  },
                  {
                    type: 'component',
                    componentName: 'layout',
                    isClosable: false,
                    title:'My orders',
                    componentState: { id: 'orders', type: 'ejs' }
                  },
                ]
              },
              {
                type: 'component',
                componentName: 'layout',
                isClosable: false,
                title:'Notification log',
                componentState: { id: 'notifications', type: 'ejs' }
              }
            ]
          },
          {
            type: 'column',
            content:[
              {
                type: 'stack',
                content:[
                  {
                    type: 'component',
                    componentName: 'layout',
                    isClosable: false,
                    title:'Etheropt',
                    componentState: { id: 'introduction', type: 'ejs' }
                  },
                  {
                    type: 'component',
                    componentName: 'layout',
                    isClosable: false,
                    title:'Connection',
                    componentState: { id: 'connection', type: 'ejs' }
                  },
                  {
                    type: 'component',
                    componentName: 'layout',
                    isClosable: false,
                    title:'Create expiration',
                    componentState: { id: 'create_expiration', type: 'ejs' }
                  }
                ]
              },
              {
                type: 'component',
                componentName: 'layout',
                isClosable: false,
                title:'Chart',
                componentState: { id: 'chart', type: 'ejs' }
              }
            ]
          }
        ]
      }
    ]
  };

  myLayout = new GoldenLayout( config, $('#layout-container') );
  myLayout.registerComponent( 'layout', function( container, state ){
    if (state.type=='ejs') {
      var html = new EJS({url: 'templates/'+state.id+'.ejs'}).render(state.data);
      container.getElement().html( html );
    }
  });
  myLayout.init();
});
