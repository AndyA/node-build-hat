def checksum(data):
  u = 1
  for i in range(0, len(data)):
    if (u & 0x80000000) != 0:
      u = (u << 1) ^ 0x1d872b41
    else:
      u = u << 1
    u = (u ^ data[i]) & 0xFFFFFFFF
  return u

with open("data/firmware.bin", "rb") as f:
  firm = f.read()

u = checksum(firm)
print(u)