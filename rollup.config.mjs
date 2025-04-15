import path from 'path';
import resolve from '@rollup/plugin-node-resolve'; // 使用官方插件
import commonjs from '@rollup/plugin-commonjs'; // 使用官方插件
import babel from '@rollup/plugin-babel'; // 使用官方插件
import postcss from 'rollup-plugin-postcss';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'auto',
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
    },
  ],
  plugins: [
    peerDepsExternal(), // 处理 peer dependencies
    resolve({
      extensions: ['.js', '.jsx'], // 解析 .jsx 文件
    }),
    commonjs(), // 转换 commonjs 模块为 es6
    postcss({ extract: true }), // 提取 CSS
    babel({
      babelHelpers: 'bundled', // 配置 Babel
      extensions: ['.js', '.jsx'], // 处理 JSX 和 JS 文件
      include: ['src/**/*'], // 只编译 src 下的文件
    }),
  ],
};