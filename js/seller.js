
import ResilientSDK from 'https://cdn.resilientdb.com/resilient-sdk.js';

const sdk = new ResilientSDK();

var flag;

export function getAllTransactions(key='') {
    const url = 'https://cloud.resilientdb.com/graphql';
    const graphqlQuery = `
        query {
            getFilteredTransactions(filter: {
                ownerPublicKey: ""
                recipientPublicKey: "${key}"
            }) {
                id
                version
                amount
                metadata
                operation
                asset
                publicKey
                uri
                type
            }
        }
    `;
  
    const payload = {
        query: graphqlQuery
    };
  
    const headers = {
        'Content-Type': 'application/json',
        // Add any other headers as needed (e.g., authorization headers)
    };
  
    return fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        const getTimestamp = (obj) => {

            let new_obj;
            try {
                new_obj = JSON.parse(obj.asset.replace(/'/g, '"'));
            } catch (error) {
                console.error('Error parsing JSON:', obj);
            }

            return new_obj ? new_obj.data.timestamp : undefined;
        };
        // console.log(data);
        const sortedData = data.data.getFilteredTransactions
                                .filter(item => getTimestamp(item) !== undefined) // Filter out items without a timestamp
                                .sort((a, b) => getTimestamp(b) - getTimestamp(a));

        return sortedData;
    })
    .catch(error => {
        console.log("error aiman")
        console.error('Error:', error);
        // setTimeout(() => longPoll(key), 15000); // Retry after 5 seconds in case of error
    });
}

export async function getAllLands(user_public_key) {
    return getAllTransactions(user_public_key)
        .then(data => {
            var lands = [];
            for (let i=0; i<data.data.getFilteredTransactions.length; i++) {
                str_data = data.data.getFilteredTransactions[i].asset;
                var correctedJsonString = str_data.replace(/'/g, '"');
                try {
                    var jsonObject = JSON.parse(correctedJsonString);
                    if (jsonObject.data.type == "land") {
                        lands.push(jsonObject.data);
                    }
                } catch (e) {
                    console.error("Error parsing JSON string:", e);
                }
            }
            return lands
        })
        .catch(error => {
            console.log("Error = ", error);
        });
}

export async function getSellerData(transactions, user_public_key) {
    if (transactions==null) {
        console.log("calling seller Data");
        transactions = await getAllTransactions(user_public_key);
    }
    var lands = [];
    var currentBalance;

    for (let i=0; i<transactions.length; i++) {
        var str_data = transactions[i].asset;
        var correctedJsonString = str_data.replace(/'/g, '"');
        try {
            var jsonObject = JSON.parse(correctedJsonString);
            if (jsonObject.data.type == "balance") {
                currentBalance = transactions[i].amount;
                break;
            }
        } catch (e) {
            console.error("Error parsing JSON string:", e);
        }
    }
    let landStatuses = {};
    for (let i=0; i<transactions.length; i++) {
        var str_data = transactions[i].asset;
        var correctedJsonString = str_data.replace(/'/g, '"');
        try {
            var jsonObject = JSON.parse(correctedJsonString);
            if (jsonObject.data.type == "land") {
                if (landStatuses[jsonObject.data.id] && landStatuses[jsonObject.data.id]["status"] == "sold") {
                    continue;
                }
                landStatuses[jsonObject.data.id] = {
                    "status": jsonObject.data.status,
                }
            }
        } catch (e) {
            console.error("Error parsing JSON string:", e);
        }
    }
    for (let i=0; i<transactions.length; i++) {
        var str_data = transactions[i].asset;
        var correctedJsonString = str_data.replace(/'/g, '"');
        try {
            var jsonObject = JSON.parse(correctedJsonString);
            if (jsonObject.data.type == "land") {
                if (landStatuses[jsonObject.data.id]["status"] == "sold" && jsonObject.data.status=="available") {
                    continue;
                }
                lands.push(jsonObject.data);
            }
        } catch (e) {
            console.error("Error parsing JSON string:", e);
        }
    }
    var payload = {
        "lands": lands,
        "currentBalance": currentBalance
    }
    return payload;
}
  
export async function getBuyerData() {
    console.log("calling getBuyer Data");
    var transactions = await getAllTransactions();
    console.log(transactions);
    var lands = [];
    var currentBalance;
    var buyerId;
    var sellerPublicKey;

    // loop over all transactions to collect all the sellers and their ids and balance in a dictionary
    let sellers = {};
    for (let i=0; i<transactions.length; i++) {
        var str_data = transactions[i].asset;
        var correctedJsonString = str_data.replace(/'/g, '"');
        try {
            var jsonObject = JSON.parse(correctedJsonString);
            if (jsonObject.data.role == "role-seller") {
                var sellerData = await getSellerData(transactions, transactions[i].publicKey)
                sellers[transactions[i].publicKey] = {
                    "sellerId": transactions[i].id,
                    "currentBalance": sellerData.currentBalance
                }
            }
        } catch (e) {
            console.error("Error parsing JSON string:", e);
        }
    }

    let landStatuses = {};
    for (let i=0; i<transactions.length; i++) {
        var str_data = transactions[i].asset;
        var correctedJsonString = str_data.replace(/'/g, '"');
        try {
            var jsonObject = JSON.parse(correctedJsonString);
            if (jsonObject.data.type == "land") {
                if (landStatuses[jsonObject.data.id] && landStatuses[jsonObject.data.id]["status"] == "sold") {
                    continue;
                }
                landStatuses[jsonObject.data.id] = {
                    "status": jsonObject.data.status,
                }
            }
        } catch (e) {
            console.error("Error parsing JSON string:", e);
        }
    }
    console.log("landStatuses = ", landStatuses);

    for (let i=0; i<transactions.length; i++) {
        var str_data = transactions[i].asset;
        var correctedJsonString = str_data.replace(/'/g, '"');
        try {
            var jsonObject = JSON.parse(correctedJsonString);
            if (jsonObject.data.type == "balance" 
                    && transactions[i].publicKey == localStorage.getItem("currentPublicKey")) {
                currentBalance = transactions[i].amount;
                buyerId = transactions[i].id;
                break;
            }
        } catch (e) {
            console.error("Error parsing JSON string:", e);
        }
    }

    for (let i=0; i<transactions.length; i++) {
        var str_data = transactions[i].asset;
        var correctedJsonString = str_data.replace(/'/g, '"');
        try {
            var jsonObject = JSON.parse(correctedJsonString);
            if (jsonObject.data.type == "land") {
                console.log("buyer deatils land = ", transactions[i]);
                sellerPublicKey = transactions[i].publicKey;
                jsonObject.data["sellerPublicKey"] = sellerPublicKey;
                jsonObject.data["sellerId"] = sellers[sellerPublicKey]["sellerId"];
                jsonObject.data["sellerCurrentBalance"] = sellers[sellerPublicKey]["currentBalance"];
                jsonObject.data["landId"] = transactions[i].id;
                jsonObject.data["buyerPublicKey"] = jsonObject.data.buyerPublicKey;
                if (landStatuses[jsonObject.data.id]["status"] == "sold" && jsonObject.data.status=="available") {
                    continue;
                }
                lands.push(jsonObject.data);
            }
        } catch (e) {
            console.error("Error parsing JSON string:", e);
        }
    }
    var payload = {
        "lands": lands,
        "currentBalance": currentBalance,
        "buyerId": buyerId
    }
    return payload;
}

export async function buyNow(id, name, state, price, buyerCurrentBalance, buyerId, sellerCurrentBalance, sellerPublicKey, sellerId, landId){
price = parseInt(price);
sellerCurrentBalance = parseInt(sellerCurrentBalance);
buyerCurrentBalance = parseInt(buyerCurrentBalance)
if (price > buyerCurrentBalance) {
    alert("insufficient Balance");
    // redirect('/buyer-dashboard.html')
    window.location.href = './buyer_dashboard.html'
} else {
    console.log("Sufficient Balance");
    var buyerUpdatedBalance = -price + buyerCurrentBalance;
    var sellerUpdatedBalance = price + sellerCurrentBalance;
    var withdraw_message = `"timestamp": ${new Date().getTime()}, "type": "balance"`;

    // update land to sold - payload
    var buyerPublicKey = localStorage.getItem("currentPublicKey");
    var land_details = `"id":${id}, "name": "${name}", "state": "${state}",  "price": ${price} , "type":"land",  "timestamp": ${new Date().getTime()}, "status": "sold", "buyerPublicKey":"${buyerPublicKey}" `

    const valuesList = [
        {
            id: buyerId,
            message: withdraw_message,
            amount: buyerUpdatedBalance,
            address: buyerPublicKey,
        },
        {
            id: sellerId,
            message: withdraw_message,
            amount: sellerUpdatedBalance,
            address: sellerPublicKey,
        },
        {
            id: landId,
            message: land_details,
            amount: price,
            address: sellerPublicKey
        }
    ];

    sdk.sendMessage({
        direction: "update-multi-page-script",
        values: valuesList,
    });
    flag = "update-land-status-to-sold";
}
}

sdk.addMessageListener((event) => {
    const message = event.data.data;
    var nexres_response = message;
    console.log(nexres_response);
    console.log(flag);

    if (flag == "submit-payment") {
      var user_public_key = nexres_response;
      localStorage.setItem("currentPublicKey", user_public_key);
      var base_initial_amount = 10000;
      var user_details = ` "name": "${user_name}", "ssn": "${ssn}",  "role": "${role}",  "type": "balance", "timestamp": ${new Date().getTime()}`

      flag = "show-dashboard";
      sdk.sendMessage({
        direction: "commit-page-script",
        message: user_details,
        amount: base_initial_amount,
        address: user_public_key,
      });

    } else if (flag == "show-dashboard") {
      console.log("user registered");
      showLoader();
      setTimeout(function () {
      if (currentRole == "buyer") {
        window.location.href = './buyer_dashboard.html'
      } else if (currentRole == "seller") {
        window.location.href = './seller_dashboard.html'
      }
      hideLoader();
    }, 3000);

      flag = "user-logged-in";
    }else if(flag == "land-added"){
      alert("Land Added")
      window.location.href   = './seller_dashboard.html'
      
    } else if (flag=="user-logged-in") {
    } else if (flag == "update-land-status-to-sold") {
        // commit message to update land
        alert("Congratulations! You bought a land!");
    }
});