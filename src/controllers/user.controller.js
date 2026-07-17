import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}

    } catch(error){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res) => {
    const {fullname,email,username,password} = req.body;
    if ([fullname, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }
    const existingUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(existingUser){
        throw new ApiError(409,`User with given username or email already exists`)
    }

    const user = await User.create({
        fullname,
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
})

const loginUser = asyncHandler(async (req,res) => {
    const {username,email,password} =req.body
    if(!(username || email)){
        throw new ApiError(400,"Username or password is required")
    }
    const existingUser = await User.findOne({
        $or: [{username},{email}]
    })
    if(!existingUser){
        throw new ApiError(409,"no user with given ussername or email found")
    }
    const pass = await existingUser.isPasswordCorrect(password)
    
    if(!pass){
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(existingUser._id)

    const loggedInUser = await User.findById(existingUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}