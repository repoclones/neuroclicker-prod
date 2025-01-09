function UncompressLargeBin(arr)
{
    let i;
    let arr2 = arr.split(';');
    let bits = [];
    for (i in arr2)
    {
        bits.push(UncompressBin(parseInt(arr2[i])));
    }
    arr2=[];
    for (i in bits)
    {
        for (let ii in bits[i]) arr2.push(bits[i][ii]);
    }
    return arr2;
}

function UncompressBin(num)//uncompress a number like 54 to a sequence like [0,1,1,0,1,0].
{
    let arr = num.toString();
    arr=arr.split('');
    arr.reverse();
    arr.shift();
    arr.pop();
    return arr;
}

export { UncompressLargeBin }