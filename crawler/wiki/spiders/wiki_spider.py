import hashlib
import re
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule
from scrapy.selector import Selector
from bs4 import BeautifulSoup
from wiki.items import WikiItem
from datetime import datetime

class WikiSpider(CrawlSpider):
    name = "wiki"
    
    allowed_domains= ["de.wikipedia.org"]

    start_urls = ["https://de.wikipedia.org/wiki/Spezial:Alle_Seiten","https://de.wikipedia.org/wiki/Spezial:Alle_Seiten?from=Programmieren&to=&namespace=0", "https://de.wikipedia.org/wiki/Spezial:Alle_Seiten?from=Versionierung&to=&namespace=0", "https://de.wikipedia.org/wiki/Spezial:Alle_Seiten?from=Darknet&to=&namespace=0", "https://de.wikipedia.org/wiki/Spezial:Alle_Seiten?from=WebCrawler&to=&namespace=0"]
    rules = [
        Rule(LinkExtractor(allow=r'\/wiki\/.*'), callback='parse_items')
    ]

        # Erzeugt einen md5 Hash anhand des uuid, Section, Url und der Klasse, dieser wird später als UID für den Index verwendet
    def generateUID(self, item, encoding):
        m = hashlib.md5()
        uid = item['url'] + item['html']
        uid = uid.encode(encoding)
        m.update(uid)
        return m.hexdigest()

    def createItem(self, response):
        item = WikiItem()

        # init Fields for correct sort
        item['uid'] = ""

        # URL from crawled Site (used for generatedUID -> elastic)
        m = re.search('(http[s]?:\/\/)?([^\/\s]+)(.*)', response.url)
        if m:
            relativeUrl = m.group(3)
            item['url'] = "https://de.wikipedia.org" + relativeUrl
        else:
            item['url'] = "https://de.wikipedia.org" + url


        responseSelector = Selector(response)

        # Plugin for easy HTML parsing
        soup = BeautifulSoup(responseSelector.extract(), 'html.parser')

        item['pageTitle'] = soup.find('title').text
        item['text'] = ""

        for p_tag in soup.findAll('p'):
            item['text'] = item['text'] + p_tag.text.replace("\t", " ").replace("\r", " ").replace("\n", " ").replace("  ", " ").strip()

        # HTML Content of parsed Component
        item['html'] = responseSelector.extract()

        # Generated UID which is used as UID for Elastic, so every Item is Unique
        item['uid'] = self.generateUID(item, 'utf-8')
        return item


    def parse_items(self, response):
        yield self.createItem(response)