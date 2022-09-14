import Test from '../framework';
import { alphabet, randomFromAlph } from '../util';

Test.test('Self | user-auth code generator', async () => {
    // test 100 codes
    for (let i = 0; i < 10; i += 0.1) {
        let len = Math.ceil(i);

        let code = randomFromAlph(len);
        for (const char of code) {
            if (!alphabet.includes(char)) {
                return `Unexpected char in generated random code: '${char}' (${code})`;
            }
        }
        if (code.length !== len) {
            return `User code is of incorrect length: '${code}'`;
        }
    }

    return true;
});
