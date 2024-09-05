#!/bin/bash

set -uo pipefail
# set -x

check_dependency () {
	which pup &> /dev/null || {
		echo 'pup is required' >&2
		return 1
	}
	which parallel &> /dev/null || {
		echo 'parallel is required' >&2
		return 1
	}
	which jo &> /dev/null || {
		echo 'jo is required' >&2
		return 1
	}
	return 0
}

get_latest_news_no () {
	curl -s 'https://minkabu.jp/news/search?category=new_arrivals' \
		| pup '#v-news-search-ssr li div.md_index_article a attr{href}' \
		| grep -Eo '[^/]+$' \
		| sort -n \
		| tail -n 1
}

get_matched_title () {
	local news_no=$1 search_words="$2" html title published_at
	html=$(curl -s "https://minkabu.jp/news/$news_no") || return
	title=$(pup '#contents h1 text{}' <<< "$html")
	grep -E "$search_words" <<< "$title" &> /dev/null
	(( $? == 0 )) && {
		published_at=$(echo "$html" | pup '#contents div.flr text{}' | sed 's/投稿://')
		echo -e "${news_no}\t${title}\t${published_at}"
	}
}

get_matched_news () {
	local -i first=$1
	local -i last=$(( $2 == 0 ? first - 19 : $2 + 1 ))
	shift 2
	local search_words=$(sed 's/ /|/g' <<< "$*")
	export -f get_matched_title
	parallel -j 0 -k get_matched_title ::: $(seq $first -1 $last) ::: "$search_words"
}

main () {
	(( $# < 2 )) && {
		echo "Usage: $(basename $0) LAST_NEWS_NO SEARCH_WORD..." >&2
		return
	}
	check_dependency || return

	local -i last_news_no=$1 latest_news_no
	latest_news_no=$(get_latest_news_no) || return
	shift 1

	local items=()
	while read line
	do
		items+=("$(jo no=$(cut -f 1 <<< "$line") title="$(cut -f 2 <<< "$line")" published_at="$(cut -f 3 <<< "$line")")")
	done < <(get_matched_news $latest_news_no $last_news_no "$@")

	local news
	if (( ${#items[@]} < 1 )); then
		news='[]'
	else
		news=$(jo -a "${items[@]}")
	fi
	jo latestNewsNo=$latest_news_no matchedNews="$news"
}

main "$@"
