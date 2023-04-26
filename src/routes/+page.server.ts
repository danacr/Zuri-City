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

    // sort by most free spots
    openParkings.sort(
        (a, b) => b.content!.split("/", 2)[1]
            .localeCompare(
                a.content!.split("/", 2)[1])
    );

    // only extract first part of "Parkhaus Hauptbahnhof / Sihlquai 41"
    // add hyperlinks on status to the details page
    // add google maps driving url to the title
    // https://developers.google.com/maps/documentation/urls/get-started#directions-action
    let google_maps_url = "https://www.google.com/maps/dir/?api=1&travelmode=driving&dir_action=navigate&destination="
    openParkings = openParkings.map(parking => {

        let title_split = parking.title!.split("/", 2)

        parking.title = "<a style=text-decoration:none href=" + google_maps_url +

            title_split[0].substring(0,

                title_split[0].length - 1)

                .replace(/\s+/g, '+')

            + ">" + title_split[0] + "</a>";

        parking.content = "<a href=" + parking.link + ">" + parking.content + "</a>";

        return parking;
    });
    // console.log(openParkings[1]) // check example_parking.json for an example


    return {
        props: {
            openParkings
        }
    };
};


