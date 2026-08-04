import pandas as pd 

df = pd.read_csv('dataset/synthetic_logs.csv')
#print(df.head(3))
#print(df.source.unique())
print(df.label.unique())

