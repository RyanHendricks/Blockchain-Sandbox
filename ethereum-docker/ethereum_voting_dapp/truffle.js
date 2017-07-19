// Allows us to use ES6 in our migrations and tests.
require('babel-register')

module.exports = {
  networks: {
    development: {
      host: 'testrpc',
      port: 8545,
      network_id: '*' // Match any network id
    },
    testnet: {
	    network_id: 3,
	    host: 'ec2-52-17-189-58.eu-west-1.compute.amazonaws.com',
	    port: 8545,
	}
  }
}