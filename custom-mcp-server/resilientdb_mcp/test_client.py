# test_with_mcp_fixed.py
import asyncio
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

async def test():
    server_params = StdioServerParameters(
        command="python",
        args=["./resilientdb_mcp.py"]
    )
    
    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            # Initialize the connection
            await session.initialize()
            
            # List available tools
            tools_result = await session.list_tools()
            # The result is an object with a 'tools' attribute
            tools = tools_result.tools
            
            print(f"Available tools: {len(tools)}")
            for tool in tools:
                print(f"  - {tool.name}: {tool.description}")
            
            # Test calling a tool
            print("\n" + "="*50)
            print("Testing 'check_dependencies' tool...")
            print("="*50)
            
            result = await session.call_tool(
                "check_dependencies", 
                {}
            )
            print(result.content)

if __name__ == "__main__":
    asyncio.run(test())