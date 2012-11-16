/*global describe:true, it:true, before:true, after:true */

var
	chai = require('chai'),
	assert = chai.assert,
	expect = chai.expect,
	should = chai.should()
	;

var
	qs = require('qs'),
	SignedQuery = require('../lib/signer').SignedQuery,
	util = require('util')
	;


// These values are borrowed from recurly's own Ruby gem test suite, so I can
// be sure I'm generating the same things they are.
var testAPIKey = '0123456789abcdef0123456789abcdef';
var testNonce = 'unique';
var testTimestamp = 1329942896;

// Fixture for a query used in several tests.
function transactionTestFixture()
{
    var query = new SignedQuery(testAPIKey);
    query.set('account', {'account_code': '123'});
    query.set('nonce', testNonce);
    query.set('timestamp', testTimestamp);
    query.set('transaction', {'amount_in_cents': 5000, 'currency': 'USD' });

    return query;
}


describe('recurly secure parameters signer', function()
{
    var recurlyUnencoded = 'account[account_code]=123&nonce=unique&timestamp=1329942896&transaction[amount_in_cents]=5000&transaction[currency]=USD';
    var recurlyEncoded = 'account%5Baccount_code%5D=123&nonce=unique&timestamp=1329942896&transaction%5Bamount_in_cents%5D=5000&transaction%5Bcurrency%5D=USD';

	it('generates a query string exactly like the Recurly example', function()
	{
	    var recurlyTest = transactionTestFixture();
	    var str = recurlyTest.serialize();

        assert.equal(str, recurlyUnencoded, 'parameter stringifying does not work identically to the ruby/php versions');
        assert.equal(encodeURI(str), recurlyEncoded, 'encodeURI() broke it');
	});

	it('the generated HMAC is identical to the one generated by Recurly', function()
	{
	    var recurlyTest = transactionTestFixture();
        var str = encodeURI(qs.stringify(recurlyTest.params));
	    var hmac = recurlyTest.HMAC(str);
	    assert.equal(hmac, '95c000d2aa045cb20596b8a751b08c8dfaee8cf2', 'generated hmac did not match the recurly example');
	});

	it('generates a final signed parameter string in the expected format', function()
	{
	    var recurlyTest = transactionTestFixture();
	    var result = recurlyTest.toString();
        var transactionTestExpected = '95c000d2aa045cb20596b8a751b08c8dfaee8cf2|account%5Baccount_code%5D=123&nonce=unique&timestamp=1329942896&transaction%5Bamount_in_cents%5D=5000&transaction%5Bcurrency%5D=USD';

	    assert.equal(result, transactionTestExpected, 'final signed string is in the wrong format');
	});

	it('passes the recurly subscription signing test', function()
	{
        var query = new SignedQuery(testAPIKey);
        query.set('account', {'account_code': '123'});
        query.set('nonce', testNonce);
        query.set('subscription', {'plan_code': 'gold'});
        query.set('timestamp', testTimestamp);

        var subscriptionTestExpected = '295bd0626ab03fd01053fb0784bd5187b563cbeb|account%5Baccount_code%5D=123&nonce=unique&subscription%5Bplan_code%5D=gold&timestamp=1329942896';
	    var result = query.toString();
	    assert.equal(result, subscriptionTestExpected, 'signed subscription transaction incorrect');
	});

	it('can sign update billing info requests', function()
	{
        var query = new SignedQuery(testAPIKey);
        query.set('account', {'account_code': '123'});
        query.set('nonce', testNonce);
        query.set('timestamp', testTimestamp);

	    var expected = '86509e315e8396423e420839a9c4cbafd5f230f3|account%5Baccount_code%5D=123&nonce=unique&timestamp=1329942896';
        var result = query.toString();
	    assert.equal(result, expected, 'billing info signature failure');
	});

});
