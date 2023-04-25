/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    runtime: 'nodejs18.x',
    regions: 'fra1'
};

import type { PageServerLoad } from './$types';

import Parser from 'rss-parser';


export const load: PageServerLoad = async () => {
    const parser: Parser = new Parser({})

    const feed = await parser.parseURL('https://www.pls-zh.ch/plsFeed/rss');
    feed.items.forEach(item => {
        console.log(item.title + ':' + item.link) // item will have a `bar` property type as a number
      });
    return {
        props: {
            feed
        }
    };
};


