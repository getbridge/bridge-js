util = require 'util'
helpers = require('coffee-script').helpers
# amqp = require 'amqp'

guidgenerator = ->
    S4 = ->
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1)
    return (""+S4()+S4()+S4()+S4()+S4()+S4()+S4()+S4())

class NowObject
    constructor: (parent, config) ->
        config = config or {}
        config.parent = parent
        @config = helpers.merge({
            name: undefined
            is_original: false
        }, config)
        @children = {}

        if not @config.parent
            @config.root = @
            @config.public_name = guidgenerator()
            @config.name = ''
            @config.is_original = true
        else
            if not @config.name
                @config.name = guidgenerator()
                @config.is_original = true
            @config.public_name = @config.name
            @config.root = @config.parent.root
    
    register_child: (name, child) =>
        # console.log 'REGISTER', name, child
        @children[name] = child

    get_child: (name) =>
        return new NowObject(@, 
            {
                name: name
            }
        )

class NowClient extends NowObject
    constructor: (config) ->
        super(undefined, config)

        @_local = new NowObject(@, name: @config.public_name)
        @register_child('local', @_local)
        @register_child(@config.public_name, @_local)

class HelloService extends NowObject
    handle_hello: ->
        console.log('HELLO WORLD')

main = ->
    now = new NowClient()

    console.log( now.get_child('local') )

    now('webpull.fetch_url')({
        'url': 'http://www.cnn.com/'
    })

    # webpull = now.get_child('webpull')
    # console.log(now)
    # console.log(webpull)

    # console.log( now.webpull );

    # now.webpull.fetch_url(url="http://www.cnn.com/",
    #     (data) ->
    #         console.log data
    # )

if not module.parent
    main()