#!/bin/sh

export export CRAWL_START_URL="www.baur.de"
export ELASTICSEARCH_INDEX="test"
export ELASTICSEARCH_IP="localhost:9200"
export http_proxy="http://proxy.baur.de:8080"
export https_proxy="http://proxy.baur.de:8080"
export CRAWL_DELAY="0m"
export ELASTICSEARCH_CLEAR_INDEX="true"