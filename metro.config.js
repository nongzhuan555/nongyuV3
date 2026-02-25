// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 解决 markdown-it 及其依赖包导入 json 文件的问题
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'json');
config.resolver.sourceExts.push('json');

module.exports = config;
