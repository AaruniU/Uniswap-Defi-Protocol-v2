// SPDX-License-Identifier: MIT
// Reference: https://www.youtube.com/watch?v=qB2Ulx201wY
pragma solidity = 0.8.18;

import "hardhat/console.sol";

abstract contract UniswapV2Router02
{
    // Swap one token for another
    function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) virtual external returns (uint[] memory amounts);
    // Find max WBTC we can get for provided DAI
    function getAmountsOut(uint amountIn, address[] calldata path) external virtual view returns (uint[] memory amounts);
    // Provide liquidity to uniswap and earn LP Tokens in return
    function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) virtual external returns (uint amountA, uint amountB, uint liquidity);
    // Withdraw your tokens from uniswap
    function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) virtual external returns (uint amountA, uint amountB);
}

abstract contract UniswapV2Factory
{
    function getPair(address tokenA, address tokenB) external view virtual returns (address pair);
}

abstract contract ERC20
{
    function transfer(address to, uint256 amount) public virtual returns (bool);
    function approve(address spender, uint256 amount) public virtual returns (bool);
    function balanceOf(address account) public view virtual returns (uint256);

}

abstract contract UniswapPair is ERC20
{
    function token0() external virtual view returns (address);
    function token1() external virtual view returns (address);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) virtual external;
}

contract TestUniswap
{
    address DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address UNISWAPV2_ROUTER02 = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address uniswapFactoryAddress = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;

    function SwapTokens(uint amountIn, uint amountOutMin, address tokenIn, address tokenOut, address to) public 
    {
        // Approve Uniswap Router to withdraw DAI from us
        ERC20(DAI).approve(UNISWAPV2_ROUTER02, amountIn);

        // This array defines the order in which tokens will be swapped
        // tokenIn > WETH > tokenOut
        address[] memory tokenArray = new address[](3);
        tokenArray[0] = tokenIn;
        tokenArray[1] = WETH;
        tokenArray[2] = tokenOut;

        UniswapV2Router02(UNISWAPV2_ROUTER02).swapExactTokensForTokens(amountIn, amountOutMin, tokenArray, to, block.timestamp);
    }

    function GetMaxTokenAmount(uint amountIn, address tokenIn, address tokenOut) external view returns (uint amountOut)
    {
        address[] memory tokenArray = new address[](3);
        if(tokenIn == WETH || tokenOut == WETH)
        {
            tokenArray = new address[](2);
            tokenArray[0] = tokenIn;
            tokenArray[1] = tokenOut;
        }
        else 
        {    
            tokenArray = new address[](3);
            tokenArray[0] = tokenIn;
            tokenArray[1] = WETH;
            tokenArray[2] = tokenOut;
        }
        
        uint[] memory result = UniswapV2Router02(UNISWAPV2_ROUTER02).getAmountsOut(amountIn, tokenArray);
        return result[tokenArray.length-1];
    }

    function AddLiquidity(address tokenA, address tokenB, uint desiredAmtA, uint desiredAmtB, uint minAmtA, uint minAmtB, address depositLPTokensTo) public returns (uint depositedAmtA, uint depositedAmtB, uint lpTokensIssued)
    {
        // Approve Uniswap Router to withdraw tokenA and tokenB from us
        ERC20(tokenA).approve(UNISWAPV2_ROUTER02, desiredAmtA);
        ERC20(tokenB).approve(UNISWAPV2_ROUTER02, desiredAmtB);

        // Ask router to add liquidity
        (depositedAmtA, depositedAmtB, lpTokensIssued) = UniswapV2Router02(UNISWAPV2_ROUTER02).addLiquidity(tokenA, tokenB, desiredAmtA, desiredAmtB, minAmtA, minAmtB, depositLPTokensTo, block.timestamp);

        // Print the results of execution
        // Uniswap will use constant product formula to determine the final depositedAmtA/depositedAmtB
        console.log("Amount of Token A finally deposited:", depositedAmtA);
        console.log("Amount of Token B finally deposited:", depositedAmtB);
        console.log("Total number of LP Tokens issued:", lpTokensIssued);
    }

    function RemoveLiquidity(address tokenA, address tokenB, uint amtAmin, uint amtBmin, address to) public returns (uint returnedAmtA, uint returnedAmtB)
    {       
        // Get the contract for the liquidity pool
        address tokenPair = UniswapV2Factory(uniswapFactoryAddress).getPair(tokenA, tokenB);
        
        // Find out how many LP Tokens do we hold in that liquidity pool
        uint lpTokenBalance = ERC20(tokenPair).balanceOf(address(this));

        // Approve Uniswap Router so it can withdraw our LP Tokens
        ERC20(tokenPair).approve(UNISWAPV2_ROUTER02, lpTokenBalance);

        // Withdraw tokens by surrendering your LP Tokens
        (returnedAmtA, returnedAmtB) = UniswapV2Router02(UNISWAPV2_ROUTER02).removeLiquidity(tokenA, tokenB, lpTokenBalance, amtAmin, amtBmin, to, block.timestamp);

        // Display the amounts of Token A and Token B we received
        console.log("Token A returned: ", returnedAmtA);
        console.log("Token B returned:", returnedAmtB);
    }

    // Flash swap tokenA or tokenB from the tokenA/tokenB pool
    // WETH would generally be a good choice for tokenB as most tokens have a token/WETH pair
    function FlashSwap(address tokenA, address tokenB, uint swapTokenAAmt, uint swapTokenBAmt) public
    {
        // Lets find the pool corresponding to the tokenA/tokenB pair
        address tokenPair = UniswapV2Factory(uniswapFactoryAddress).getPair(tokenA, tokenB);
        require(tokenPair != address(0), "Token pair not found");

        // All Uniswap pairs have their tokens designated as token0 and token1
        // We need to figure out which token(A/B) is token0 or token1
        address token0 = UniswapPair(tokenPair).token0();
        address token1 = UniswapPair(tokenPair).token1();

        uint amt0Out; 
        uint amt1Out;
        
        if(token0 == tokenA)
        {
            amt0Out = swapTokenAAmt;
            amt1Out = swapTokenBAmt;
        }
        else
        {
            amt0Out = swapTokenBAmt;
            amt1Out = swapTokenAAmt;
        }

        bytes memory data = abi.encode(token0, token1, swapTokenAAmt, swapTokenBAmt);
        
        UniswapPair(tokenPair).swap(amt0Out, amt1Out, address(this), data);
    }

    // This is called by Uniswap pair contract when we call UniswapPair(tokenPair).swap()
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external
    {
        // msg.sender can be malicious so we need to be sure msg.sender is a token pair contract
        // Get addresses of the two tokens that msg.sender claims to be a pair contract of
        address token0 = UniswapPair(msg.sender).token0();
        address token1 = UniswapPair(msg.sender).token1();

        // Get the pair contract for token0/token1 pool
        address pair = UniswapV2Factory(uniswapFactoryAddress).getPair(token0, token1);

        // Ensure msg.sender is a pair contract
        require(msg.sender == pair, "msg.sender is not a pair contract");

        // Ensure TestUniswap contract has called this function
        require(sender == address(this), "Only TestUniswap can be the sender");

        // Lets read the values we encoded in "data" argument
        (address tokenA, address tokenB, uint swapTokenAAmt, uint swapTokenBAmt) = abi.decode(data, (address, address, uint, uint));

        // Lets calculate the fee we have to pay
        uint feeA = ((swapTokenAAmt * 3) / 997) + 1;
        uint feeB = ((swapTokenBAmt * 3) / 997) + 1;

        // Calculate the amount that we have to repay
        uint repayAmtA = swapTokenAAmt + feeA;
        uint repayAmtB = swapTokenBAmt + feeB;

        // Lets see our balances after flash swap
        console.log("Amount of tokenA we flash swapped: ", swapTokenAAmt);
        console.log("TestUniswap's balance of tokenA after flash swap: ", ERC20(tokenA).balanceOf(address(this)));
        console.log("Amount of tokenB we flash swapped: ", swapTokenBAmt);
        console.log("TestUniswap's balance of tokenB after flash swap: ", ERC20(tokenB).balanceOf(address(this)));

        // Repay both tokens back to the Uniswap pair contract
        ERC20(tokenA).transfer(pair, repayAmtA);
        ERC20(tokenB).transfer(pair, repayAmtB);
        
        // Check the balances after returning tokenA/tokenB + fee
        console.log("TestUniswap's balance after returning tokenA + fee: ", ERC20(tokenA).balanceOf(address(this)));
        console.log("TestUniswap's balance after returning tokenB + fee: ", ERC20(tokenB).balanceOf(address(this)));
    }
}
