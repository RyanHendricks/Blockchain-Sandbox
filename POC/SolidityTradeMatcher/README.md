# SolidityTradeMatcher
An experimental code to implement Security Trade Matching over Ethereum

ほふりが行っている、決済照合システムの中の、「約定照合」または「取引照合」の部分を、非常にシンプルにした形で、Etherium上で実装することができるかの実験です。
こちらに経緯、仕様等をまとめています。
https://github.com/kkoiwai/SolidityTradeMatcher/blob/master/TradeMatchingOnEthereum.pdf

## How to use まずは試してみる
    docker network create --driver bridge testnet
    docker run -d -p 3331:3000 --name=ethereum1 -h ethereum1 --net=testnet kocko/soliditytradematcher
    # １０分ほど待つ（１号機内で自動的にコントラクトのコンパイル、登録が走るので）
    docker run -d -p 3332:3000 --name=ethereum2 -h ethereum2 --net=testnet kocko/soliditytradematcher 2
    docker run -d -p 3333:3000 --name=ethereum3 -h ethereum3 --net=testnet kocko/soliditytradematcher 3

ここまで起動したら、`http://localhost:3331` `http://localhost:3332` `http://localhost:3333` にアクセスして、いろいろ遊んでみてください。
