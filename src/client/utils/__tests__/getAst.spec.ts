import getAst from '../getAst.js';

describe('getAst', () => {
	test('return AST', () => {
		const result = getAst(`42`);
		expect(result).toMatchSnapshot();
	});
});
