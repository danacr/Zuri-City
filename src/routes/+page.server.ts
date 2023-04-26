/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    runtime: 'nodejs18.x',
    regions: ['fra1']
};

import type { PageServerLoad } from './$types';

import Parser from 'rss-parser';
type CustomItem = { title: string, content: string };


export const load: PageServerLoad = async () => {
    const parser: Parser<CustomItem> = new Parser({
        customFields: {
            item: ['title', 'content']
        }
    })

    const feed = await parser.parseURL('https://www.pls-zh.ch/plsFeed/rss');

    // only show open parkings and extract the remaining spots
    let openParkings = feed.items.filter((obj) => {
        return obj.content!.split("/", 2)[0] == 'open ';
    });

    // only extract first part of "Parkhaus Hauptbahnhof / Sihlquai 41"
    openParkings = openParkings.map(parking => {
        parking.title = parking.title!.split("/", 1)[0];
        return parking;
    });

    // sort by most free spots
    openParkings.sort(
        (a, b) => b.content!.split("/", 2)[1]
            .localeCompare(
                a.content!.split("/", 2)[1])
    );


    return {
        props: {
            openParkings
        }
    };
};


